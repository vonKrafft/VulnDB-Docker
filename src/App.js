import React from 'react';
import ReactMarkdown from 'react-markdown';
import { Link, Route, Switch } from "react-router-dom";
import { Container, Message, Menu, Segment, Header, Grid, Icon, Loader, Input, Dropdown } from 'semantic-ui-react'
import './App.css';
import _ from 'lodash';

export default function App() {
    return (
        <Route path="/" component={TplHomePage} />
    );
}

class TplHomePage extends React.Component {
    state = {
        loading: true,
        activeItem: null,
        lang: 'FR',
        templates: []
    }

    componentDidMount = () => {
        fetch('/api/templates')
            .then(response => { 
                if (response.status < 400) return response.json(); 
                else throw new Error(); 
            })
            .then(result => this.setState({ 
                loading: false, 
                templates: result.data 
            }))
            .catch(error => this.setState({ 
                loading: false, 
                error 
            }));
    }

    handleMenuItemClick = (e, { uuid }) => {
        this.setState({ activeItem: uuid });
    }

    handleImportClick = (e) => {}
    handleSatisticsClick = (e) => {}
    handleAddClick = (e) => {}

    render = () => {
        const { loading, activeItem, templates, lang } = this.state;

        const ftpl = _.sortBy(_.filter(templates, ['language', lang]), [
            (o) => parseInt(o.owasp.replace(/A([0-9]+):.*/i, '$1')),
            (o) => o.title
        ]);
        const sidebar =  _.sortBy(_.reduce(ftpl, (menu, tpl) => {
            if (! menu[tpl.owasp]) {
                menu[tpl.owasp] = { category: tpl.owasp, templates: [] };
            }
            if (tpl.owasp !== tpl.title) {
                menu[tpl.owasp].templates.push(tpl);
            }
            return menu;
        }, {}), [(o) => {
            return parseInt(o.category.replace(/A([0-9]+):.*/i, '$1'));
        }]);

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

        const TplSidebar = ({data, shown, total}) => {
            const options = [
                { key: 'FR', text: 'FR', value: 'FR' },
                { key: 'EN', text: 'EN', value: 'EN' },
            ]
            return (
                <React.Fragment>
                    <Input 
                        fluid 
                        placeholder='Search...' 
                        label={
                            <Dropdown defaultValue={lang} options={options} />
                        }
                        labelPosition='right'
                    />
                    <TplSidebarNav data={data} shown={shown} total={total} />
                </React.Fragment>
            );
        };

        const TplSidebarNav = ({data, shown, total}) => (
            <Menu vertical>
                <Menu.Item>
                    <Message size='mini'>
                        {shown} / {total} templates shown
                    </Message>
                </Menu.Item>
                { _.map(data, (menu) => (
                    <Menu.Item>
                        <Menu.Header>{menu.category}</Menu.Header>
                        <Menu.Menu>
                            { _.map(menu.templates, (template) => (
                                <Menu.Item>
                                    <Link to={`view/${lang}/${template.uuid}`}>
                                        {template.title}
                                    </Link>
                                </Menu.Item>
                            )) }
                        </Menu.Menu>
                    </Menu.Item>
                )) }
            </Menu>
        );

        const TplItem = ({template}) => (
            <Segment size='mini' secondary={template.owasp === template.title}>
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

        if (loading) {
            return (
                <React.Fragment>
                    <TplNavbar />
                    <Container className='wrapper'>
                        <Grid>
                            <Grid.Column width={4}>
                                <TplSidebar data={[]} shown={0} total={0} />
                            </Grid.Column>
                            <Grid.Column width={12} floated='right'>
                                <Loader active inline='centered' />
                            </Grid.Column>
                        </Grid>
                    </Container>
                </React.Fragment>
            );

        } else {
            return (
                <React.Fragment>
                    <TplNavbar />
                    <Container className='wrapper'>
                        <Grid>
                            <Grid.Column width={4}>
                                <TplSidebar 
                                    data={sidebar} 
                                    shown={ftpl.length} 
                                    total={templates.length} 
                                />
                            </Grid.Column>
                            <Grid.Column width={12} floated='right'>
                                { _.map(ftpl, (template) => (
                                    <TplItem template={template} />
                                )) }
                            </Grid.Column>
                        </Grid>
                    </Container>
                </React.Fragment>
            );
        }
    }
}