import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, Route, Redirect } from "react-router-dom";
import { Container, Message, Menu, Segment, Header, Grid, Icon, Loader, Input, Dropdown, Dimmer } from 'semantic-ui-react'
import './App.css';
import _ from 'lodash';

export default function App() {
    const renderTplHomePage = (props) => ( <TplHomePage {...props} /> );
    return (
        <React.Fragment>
            <Route path="/" exact render={() => <Redirect to="/home/FR" />} />
            <Route path="/home/:lang" render={renderTplHomePage} />
            <Route path="/search/:lang/:text" render={renderTplHomePage} />
        </React.Fragment>
    );
}

class TplHomePage extends React.Component {
    state = {}

    constructor(props) {
        const { lang, uuid, text } = props.match.params;
        super(props);
        this.state = {
            loading: true,
            lang: lang || 'FR',
            activeItem: uuid || null,
            search: text || '',
            data: [],
            total: 0,
            templates: []
        };
    }

    componentDidMount = () => {
        fetch('/api/templates')
            .then(response => { 
                if (response.status < 400) return response.json(); 
                else throw new Error(); 
            })
            .then(result => {
                const { lang, search, uuid } = this.state;
                this.filterTemplates(result.data, lang, search, uuid);
            })
            .catch(error => this.setState({ 
                loading: false, 
                error 
            }));
    }

    filterTemplates = (data, lang, search, uuid) => {
        this.setState({ 
            loading: true 
        });

        const templates = _.sortBy(_.filter(data, (o) => {
            if (!search) return o.language === lang;
            return o.language === lang && o.owasp !== o.title && (
                o.title.toUpperCase().match(search.toUpperCase()) || 
                o.description.toUpperCase().match(search.toUpperCase()) || 
                o.consequences.toUpperCase().match(search.toUpperCase()) || 
                o.recommendations.toUpperCase().match(search.toUpperCase()) 
            );
        }), [
            (o) => parseInt(o.owasp.replace(/^A([0-9]+):.*$/i, '$1')),
            (o) => o.title
        ]);

        this.setState({ 
            loading: false, 
            lang: lang, 
            search: search, 
            uuid: uuid, 
            data: data, 
            total: data.length, 
            templates: templates 
        });
    }

    handleSearchChange = (e, { name, value }) => {
        const { data, lang, search, uuid } = { ...this.state, [name]: value };
        this.filterTemplates(data, lang, search, uuid);
        //this.searchInputRef.focus();
        console.log(this.searchInputRef);
    }

    handleSearchClear = (e) => {
        const { data, lang, uuid } = this.state;
        this.filterTemplates(data, lang, '', uuid);
    }

    handleImportClick = (e) => {}
    handleSatisticsClick = (e) => {}
    handleAddClick = (e) => {}

    render = () => {
        const { loading, templates, total, search, lang } = this.state;

        const TplNavbar = () => (
            <Menu pointing secondary inverted size='huge' className='navbar'>
                <Container>
                    <Menu.Item header>VulnDB</Menu.Item>
                    <Menu.Menu icon position='right'>
                        <Menu.Item href='/api/export' target='_blank'>
                            <Icon name='download' />
                        </Menu.Item>
                        <Menu.Item onClick={this.handleImportClick}>
                            <Icon name='upload' />
                        </Menu.Item>
                        <Menu.Item onClick={this.handleSatisticsClick}>
                            <Icon name='line graph' />
                        </Menu.Item>
                        <Menu.Item onClick={this.handleAddClick}>
                            <Icon name='add square' />
                        </Menu.Item>
                    </Menu.Menu>
                </Container>
            </Menu>
        );

        const TplItem = ({template}) => (
            <Segment 
                ref={React.useRef(template.uuid)} 
                size='mini' 
                secondary={template.owasp === template.title}
            >
                <Header size='medium'>
                    {template.title}
                    <Header.Subheader>{template.owasp}</Header.Subheader>
                </Header>
                <TplParagraph markdown={template.description} />
                <TplParagraph markdown={template.consequences} />
                <TplParagraph markdown={template.recommendations} />
            </Segment>
        );

        const TplParagraph = ({markdown}) => {
            markdown = markdown.replace(/\b(([A-Z])\2\2)\b/g, '**_$1_**');
            return (<ReactMarkdown source={markdown} className='paragraph' />);
        };

        return (
            <React.Fragment>
                <TplNavbar />
                <Container className='wrapper'>
                    <Grid>
                        <Grid.Column width={4}>
                            <Dimmer active={loading} inverted></Dimmer>
                            <TplSearchInput 
                                search={search} 
                                lang={lang} 
                                onChange={this.handleSearchChange} 
                                onClear={this.handleSearchClear} 
                            />
                            <TplSidebarMenu 
                                templates={templates} 
                                total={total}
                                key={`Sidebar-${lang}-${search}`}
                            />
                        </Grid.Column>
                        <Grid.Column width={12} floated='right'>
                            <Dimmer active={loading} inverted><Loader /></Dimmer>
                            { _.map(templates, (template) => (
                                <TplItem template={template} />
                            )) }
                        </Grid.Column>
                    </Grid>
                </Container>
            </React.Fragment>
        );
    }
}

const TplSearchInput = (props) => {
    const { search, lang, onChange, onClear } = props;

    const options = [
        { key: 'FR', text: 'FR', value: 'FR' },
        { key: 'EN', text: 'EN', value: 'EN' },
    ];

    return (
        <Input 
            fluid 
            placeholder='Search...' 
            name='search'
            value={search}
            onChange={onChange}
            label={<Dropdown 
                name='lang' 
                value={lang || 'FR'} 
                options={options} 
                onChange={onChange}
            />}
            labelPosition='left' 
            icon={<Icon name='close' link onClick={onClear} />}
        />
    );
};

const TplSidebarMenu = (props) => {
    const { templates, total } = props;

    const sidebar =  _(templates).sortBy([
        (o) => parseInt(o.owasp.replace(/^A([0-9]+):.*$/i, '$1')),
        (o) => o.title
    ]).reduce((menu, tpl) => {
        if (! menu[tpl.owasp]) {
            menu[tpl.owasp] = { 
                category: tpl.owasp, 
                templates: [] 
            };
        }
        if (tpl.owasp !== tpl.title) {
            menu[tpl.owasp].templates.push(tpl);
        }
        return menu;
    }, {});

    return (
        <Menu vertical>
            <Menu.Item>
                <Message size='mini'>
                    {templates.length} / {total} templates shown
                </Message>
            </Menu.Item>
            { _.map(sidebar || [], (menu) => (
                <Menu.Item>
                    <Menu.Header>{menu.category}</Menu.Header>
                    <Menu.Menu>
                        { _.map(menu.templates, (template) => (
                            <Menu.Item>
                                <Link to={`view/${template.uuid}`}>
                                    {template.title}
                                </Link>
                            </Menu.Item>
                        )) }
                    </Menu.Menu>
                </Menu.Item>
            )) }
        </Menu>
    );
};